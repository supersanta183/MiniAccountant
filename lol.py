import itertools

def find_subset_sum(target, numbers):
    """
    Searches for any combination of indices in 'numbers' such that the corresponding
    elements add up exactly to 'target'. Returns a tuple of indices if a match is found,
    or None if no match exists.
    """
    # Check all possible combinations (from length 1 to len(numbers))
    for r in range(1, len(numbers) + 1):
        for combo in itertools.combinations(range(len(numbers)), r):
            subset = [numbers[i] for i in combo]
            if sum(subset) == target:
                return combo  # Return the indices of the matching subset
    return None

def process_lists(list1, list2):
    """
    For each number in list1, checks if any combination of numbers in list2 adds up
    to that number. If a match is found, it removes the number from list1 and also
    removes the corresponding numbers (by indices) from list2. The process repeats
    until a full pass through list1 results in no matches.
    """
    modified = True
    while modified:
        modified = False
        # Iterate over a copy of list1 to avoid issues while removing elements
        for target in list1.copy():
            subset_indices = find_subset_sum(target, list2)
            if subset_indices is not None:
                # Remove the target from list1
                list1.remove(target)
                # Remove the found numbers from list2.
                # Delete items by index from the largest index down to avoid shifting.
                for index in sorted(subset_indices, reverse=True):
                    del list2[index]
                # A match was found so we mark that something changed and break to restart.
                modified = True
                break  # Restart the outer loop after modifying the lists
    return list1, list2

# Example usage:
list1 = [7, 10, 12]
list2 = [3,3,4,5,6]

remaining_list1, remaining_list2 = process_lists(list1, list2)
print("Remaining in list1:", remaining_list1)
print("Remaining in list2:", remaining_list2)
